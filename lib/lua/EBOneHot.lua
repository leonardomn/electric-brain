local EBOneHot, parent = torch.class('nn.EBOneHot', 'nn.Module')

-- adapted from https://github.com/Element-Research/dpnn/blob/master/EBOneHot.lua
-- which was adapted from https://github.com/karpathy/char-rnn
-- and ultimately from https://github.com/hughperkins/char-lstm

function EBOneHot:__init(outputSize)
    parent.__init(self)
    self.outputSize = outputSize
end

function EBOneHot:updateOutput(input)
    -- Get the batch size
    local batchSize = input:size()[1]

    -- Create an output tensor
    if self:type() == 'torch.CudaTensor' then
        self.outputTensor = self.outputTensor or torch.zeros(batchSize, self.outputSize):cuda()
    else
        self.outputTensor = self.outputTensor or torch.zeros(batchSize, self.outputSize):double()
    end

    -- Zero the output
    self.outputTensor:resize(batchSize, self.outputSize)
    self.outputTensor:zero()

    -- Remove the bottom dimension, if it exists
    local baseInput = input:view(batchSize)

    -- Go through each item in the batch, set the one-hot
    -- value
    for n=1,batchSize do
        local value = baseInput[n]
        if value > 0 then
            self.outputTensor[n][value] = 1
        end
    end

    return self.outputTensor
end

function EBOneHot:updateGradInput(input, gradOutput)
    if type(input) == 'number' then
        return 0
    else
        self.gradInput:resize(input:size()):zero()
        return self.gradInput
    end
end

function EBOneHot:type(type, typecache)
    return parent.type(self, type, typecache)
end
