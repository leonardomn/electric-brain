require('torch')
require('nn')

local EBWrapDebug, parent = torch.class('nn.EBWrapDebug', 'nn.Container')

function EBWrapDebug:__init(m, name)
    parent.__init(self)

    -- Store the module and name
    self.module = m
    self.name = name

    -- so that it can be handled like a Container
    self:add(self.module)

    -- Create an output table with at least a fixed Tensor
    self.output = {torch.Tensor()}

    -- Store a reference back to the training-script object
    self.trainingScript = trainingScript
end


function EBWrapDebug:updateOutput(input)
    print(self.name .. " input")
    print(input)
    self.output = self.module:updateOutput(input)
    print(self.name .. " output")
    print(self.output)
    return self.output
end

function EBWrapDebug:updateGradInput(input, gradOutput)
    self.gradInput = self.module:updateGradInput(input, gradOutput)
    return self.gradInput
end

function EBWrapDebug:accGradParameters(input, gradOutput, scale)
    self.module:accGradParameters(input, gradOutput, scale)
end

function EBWrapDebug:accUpdateGradParameters(input, gradOutput, lr)
    self.module:accUpdateGradParameters(input, gradOutput, lr)
end

function EBWrapDebug:sharedAccUpdateGradParameters(input, gradOutput, lr)
    self.module:sharedAccUpdateGradParameters(input, gradOutput, lr)
end

function EBWrapDebug:__tostring__()
    if self.module.__tostring__ then
        return torch.type(self) .. ' @ ' .. self.module:__tostring__()
    else
        return torch.type(self) .. ' @ ' .. torch.type(self.module)
    end
end

